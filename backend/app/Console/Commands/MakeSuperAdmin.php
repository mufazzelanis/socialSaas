<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class MakeSuperAdmin extends Command
{
    protected $signature = 'user:make-admin {email : The email of the user to promote}';

    protected $description = 'Promote an existing user to super_admin so they can see the admin dashboard, activity logs, and user list.';

    public function handle(): int
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();

        if (! $user) {
            $this->error("No user found with email [{$email}].");

            return self::FAILURE;
        }

        $user->update(['role' => 'super_admin']);

        $this->info("{$user->name} ({$user->email}) is now a super admin.");

        return self::SUCCESS;
    }
}
