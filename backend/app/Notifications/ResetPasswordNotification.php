<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    public function __construct(protected string $resetUrl)
    {
    }

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Reset your '.config('app.name').' password')
            ->greeting('Hi '.$notifiable->name.',')
            ->line('You (or someone else) requested a password reset for your account.')
            ->action('Reset Password', $this->resetUrl)
            ->line('This link expires in 60 minutes.')
            ->line("If you didn't request this, you can safely ignore this email — your password won't change.");
    }
}
