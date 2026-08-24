<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AdminCreatedAccountNotification extends Notification
{
    use Queueable;

    public function __construct(protected string $plainPassword)
    {
    }

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $loginUrl = rtrim(config('app.frontend_url'), '/').'/login';

        return (new MailMessage)
            ->subject('Your '.config('app.name').' account is ready')
            ->greeting('Hi '.$notifiable->name.',')
            ->line('An administrator created an account for you on '.config('app.name').'.')
            ->line('**Email:** '.$notifiable->email)
            ->line('**Temporary password:** '.$this->plainPassword)
            ->action('Log In', $loginUrl)
            ->line('We recommend changing this password after your first login.');
    }
}
