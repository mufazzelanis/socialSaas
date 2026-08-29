<?php

namespace App\Services\Payments;

use App\Models\PaymentSetting;
use Illuminate\Support\Facades\Http;

/**
 * Thin wrapper around SSLCommerz's two REST calls — the "Session API" that
 * starts a payment (returns a hosted GatewayPageURL to send the browser to)
 * and the "Order Validation API" that confirms a completed payment actually
 * happened and for how much, before anything gets marked paid.
 */
class SslcommerzService
{
    protected function baseUrl(PaymentSetting $settings): string
    {
        return $settings->is_sandbox
            ? 'https://sandbox.sslcommerz.com'
            : 'https://securepay.sslcommerz.com';
    }

    /**
     * @param  array{total_amount: string, currency: string, tran_id: string, success_url: string, fail_url: string, cancel_url: string, ipn_url: string, cus_name: string, cus_email: string, cus_phone: ?string, product_name: string}  $params
     */
    public function createSession(PaymentSetting $settings, array $params): array
    {
        $response = Http::timeout(30)->asForm()->post($this->baseUrl($settings).'/gwprocess/v4/api.php', [
            'store_id' => $settings->store_id,
            'store_passwd' => $settings->getDecryptedPassword(),
            'total_amount' => $params['total_amount'],
            'currency' => $params['currency'],
            'tran_id' => $params['tran_id'],
            'success_url' => $params['success_url'],
            'fail_url' => $params['fail_url'],
            'cancel_url' => $params['cancel_url'],
            'ipn_url' => $params['ipn_url'],
            'shipping_method' => 'NO',
            'product_name' => $params['product_name'],
            'product_category' => 'Digital Goods',
            // Tells SSLCommerz there's nothing to ship — this is a
            // downloadable product, not a physical one.
            'product_profile' => 'non-physical-goods',
            'cus_name' => $params['cus_name'],
            'cus_email' => $params['cus_email'],
            'cus_add1' => 'N/A',
            'cus_city' => 'Dhaka',
            'cus_postcode' => '1000',
            'cus_country' => 'Bangladesh',
            'cus_phone' => $params['cus_phone'] ?: '01700000000',
            'num_of_item' => 1,
        ]);

        return $response->json() ?? [];
    }

    public function validateOrder(PaymentSetting $settings, string $valId): array
    {
        $response = Http::timeout(30)->get($this->baseUrl($settings).'/validator/api/validationserverAPI.php', [
            'val_id' => $valId,
            'store_id' => $settings->store_id,
            'store_passwd' => $settings->getDecryptedPassword(),
            'format' => 'json',
        ]);

        return $response->json() ?? [];
    }
}
