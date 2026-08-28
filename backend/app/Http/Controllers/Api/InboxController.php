<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Services\ActivityLogger;
use App\Services\Messaging\MessagingConnectorFactory;
use Illuminate\Http\Request;

class InboxController extends Controller
{
    /**
     * Every conversation belonging to one of the current user's own
     * connected accounts — other users' conversations (even on the same
     * shared Telegram bot) are never visible here.
     */
    public function index(Request $request)
    {
        $conversations = Conversation::whereHas('socialAccount', function ($query) use ($request) {
            $query->where('user_id', $request->user()->id);
        })
            ->with('socialAccount:id,platform,account_name')
            ->with('latestMessage')
            ->orderByDesc('last_message_at')
            ->get();

        return response()->json($conversations);
    }

    public function show(Request $request, Conversation $conversation)
    {
        $this->authorizeConversation($request, $conversation);

        $conversation->load(['messages', 'socialAccount:id,platform,account_name']);
        $conversation->update(['unread_count' => 0]);

        return response()->json($conversation);
    }

    public function reply(Request $request, Conversation $conversation)
    {
        $this->authorizeConversation($request, $conversation);

        $data = $request->validate([
            'content' => ['required', 'string', 'max:4000'],
        ]);

        $account = $conversation->socialAccount;
        $connector = MessagingConnectorFactory::make($account->platform);
        $result = $connector->sendMessage($account, $conversation, $data['content']);

        $message = $conversation->messages()->create([
            'direction' => 'outbound',
            'content' => $data['content'],
            'external_message_id' => $result->externalMessageId,
            'sent_by' => $request->user()->id,
            'status' => $result->success ? 'sent' : 'failed',
            'error_message' => $result->errorMessage,
        ]);

        if ($result->success) {
            $conversation->update(['last_message_at' => now()]);
        }

        ActivityLogger::log(
            $request->user(),
            'message_replied',
            "Replied to a {$account->platform} conversation with {$conversation->participant_name}.",
            ['conversation_id' => $conversation->id]
        );

        return response()->json($message->fresh(), $result->success ? 201 : 422);
    }

    protected function authorizeConversation(Request $request, Conversation $conversation): void
    {
        if ($conversation->socialAccount->user_id !== $request->user()->id) {
            abort(403);
        }
    }
}
