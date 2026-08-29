<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DigitalProduct;
use App\Models\Order;
use App\Models\PaymentSetting;
use App\Services\Payments\SslcommerzService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    public function __construct(protected SslcommerzService $sslcommerz)
    {
    }

    /**
     * Step 1: buyer submits their info on the shop page. Creates a pending
     * Order and asks SSLCommerz for a hosted payment page to send them to.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'digital_product_id' => ['required', 'exists:digital_products,id'],
            'buyer_name' => ['required', 'string', 'max:255'],
            'buyer_email' => ['required', 'email', 'max:255'],
            'buyer_phone' => ['nullable', 'string', 'max:30'],
        ]);

        $product = DigitalProduct::findOrFail($data['digital_product_id']);

        if (! $product->is_enabled) {
            return response()->json(['message' => 'This product is not available.'], 422);
        }

        $settings = PaymentSetting::current();

        if (! $settings->is_enabled || ! $settings->store_id || ! $settings->has_password) {
            return response()->json([
                'message' => "Online payment isn't set up yet — please try again later.",
            ], 422);
        }

        // ORD- prefix plus a random suffix (not the product/order id itself)
        // — this becomes part of URLs SSLCommerz redirects the browser
        // through, so it shouldn't leak anything guessable.
        $tranId = 'ORD-'.strtoupper(Str::random(16));

        $order = Order::create([
            'digital_product_id' => $product->id,
            'buyer_name' => $data['buyer_name'],
            'buyer_email' => $data['buyer_email'],
            'buyer_phone' => $data['buyer_phone'] ?? null,
            'amount' => $product->price,
            'currency' => 'BDT',
            'tran_id' => $tranId,
            'status' => 'pending',
        ]);

        $session = $this->sslcommerz->createSession($settings, [
            'total_amount' => number_format($product->price / 100, 2, '.', ''),
            'currency' => 'BDT',
            'tran_id' => $tranId,
            'success_url' => url('/api/payments/sslcommerz/success'),
            'fail_url' => url('/api/payments/sslcommerz/fail'),
            'cancel_url' => url('/api/payments/sslcommerz/cancel'),
            'ipn_url' => url('/api/payments/sslcommerz/ipn'),
            'cus_name' => $data['buyer_name'],
            'cus_email' => $data['buyer_email'],
            'cus_phone' => $data['buyer_phone'] ?? null,
            'product_name' => $product->title,
        ]);

        if (($session['status'] ?? null) !== 'SUCCESS' || empty($session['GatewayPageURL'])) {
            $order->update(['status' => 'failed', 'gateway_response' => $session]);

            return response()->json([
                'message' => $session['failedreason'] ?? 'Could not start payment — try again.',
            ], 422);
        }

        return response()->json(['redirect_url' => $session['GatewayPageURL'], 'tran_id' => $tranId]);
    }

    /**
     * The buyer's own browser lands here after paying — SSLCommerz POSTs
     * tran_id/val_id here directly. Confirmed the same way the IPN below
     * does (a browser redirect alone isn't trustworthy on its own — a
     * customer's browser is not a source either of us controls), then sent
     * on to the frontend's order-status page either way.
     */
    public function success(Request $request)
    {
        $this->confirmPayment($request->input('tran_id'), $request->input('val_id'));

        return $this->redirectToFrontend($request->input('tran_id'));
    }

    public function fail(Request $request)
    {
        $tranId = $request->input('tran_id');
        Order::where('tran_id', $tranId)->where('status', 'pending')->update(['status' => 'failed']);

        return $this->redirectToFrontend($tranId);
    }

    public function cancel(Request $request)
    {
        $tranId = $request->input('tran_id');
        Order::where('tran_id', $tranId)->where('status', 'pending')->update(['status' => 'cancelled']);

        return $this->redirectToFrontend($tranId);
    }

    /**
     * SSLCommerz's server-to-server notification — the authoritative
     * confirmation, independent of whatever the buyer's own browser did or
     * didn't do on its way through success()/fail()/cancel() above.
     */
    public function ipn(Request $request)
    {
        $this->confirmPayment($request->input('tran_id'), $request->input('val_id'));

        return response('OK', 200);
    }

    protected function redirectToFrontend(?string $tranId)
    {
        $frontend = rtrim(config('app.frontend_url'), '/');

        return redirect()->away("{$frontend}/order/{$tranId}");
    }

    /**
     * Shared by success() and ipn() — safe to call twice for the same
     * order (e.g. both fire for one real payment): does nothing once an
     * order is already marked paid.
     */
    protected function confirmPayment(?string $tranId, ?string $valId): void
    {
        if (! $tranId || ! $valId) {
            return;
        }

        $order = Order::where('tran_id', $tranId)->first();

        if (! $order || $order->isPaid()) {
            return;
        }

        $settings = PaymentSetting::current();
        $result = $this->sslcommerz->validateOrder($settings, $valId);

        $statusOk = in_array($result['status'] ?? null, ['VALID', 'VALIDATED'], true);

        // Cross-check the amount SSLCommerz itself confirms against what
        // this order actually charged for — without this, a val_id from
        // some other (possibly cheaper) transaction could mark this order
        // paid if it were ever replayed.
        $amountOk = isset($result['amount'])
            && abs((float) $result['amount'] - $order->amount / 100) < 0.01
            && ($result['currency'] ?? null) === $order->currency;

        if ($statusOk && $amountOk) {
            $order->update([
                'status' => 'paid',
                'val_id' => $valId,
                'gateway_response' => $result,
                'download_token' => Str::random(48),
            ]);
        } else {
            Log::warning('SSLCommerz validation failed or amount mismatch.', ['tran_id' => $tranId, 'result' => $result]);
            $order->update(['status' => 'failed', 'gateway_response' => $result]);
        }
    }

    /**
     * Polled by the frontend's order-status page — deliberately returns
     * only what a buyer needs to see, never the raw gateway_response or
     * anything about other orders.
     */
    public function show(string $tranId)
    {
        $order = Order::with('digitalProduct')->where('tran_id', $tranId)->firstOrFail();

        return response()->json([
            'status' => $order->status,
            'product_title' => $order->digitalProduct->title,
            'amount' => round($order->amount / 100, 2),
            'download_url' => $order->isPaid() && $order->download_token
                ? url("/api/orders/{$order->tran_id}/download/{$order->download_token}")
                : null,
        ]);
    }

    public function download(string $tranId, string $token)
    {
        $order = Order::where('tran_id', $tranId)->where('download_token', $token)->first();

        if (! $order || ! $order->isPaid()) {
            abort(404);
        }

        $product = $order->digitalProduct;

        if (! $product || ! $product->fileExists()) {
            abort(404, 'File not available — please contact support.');
        }

        $order->increment('download_count');

        return Storage::disk('local')->download($product->file_path, $product->file_name ?: basename($product->file_path));
    }
}
