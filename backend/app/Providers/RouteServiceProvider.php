<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to the "home" route for your application.
     *
     * Typically, users are redirected here after authentication.
     *
     * @var string
     */
    public const HOME = '/home';

    /**
     * Define your route model bindings, pattern filters, and other route configuration.
     *
     * @return void
     */
    public function boot()
    {
        $this->configureRateLimiting();

        $this->routes(function () {
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));

            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }

    /**
     * Configure the rate limiters for the application.
     *
     * @return void
     */
    protected function configureRateLimiting()
    {
        RateLimiter::for('api', function (Request $request) {
            // Key the limit by TENANT (company) first, then authenticated user,
            // then IP as a last resort. Most API calls are unauthenticated and
            // carry company_id, so without this they all key by the caller's IP —
            // and an entire office behind one public/NAT IP shares a single
            // bucket, tripping 429s under normal multi-user load. Keying by
            // company_id isolates each tenant into its own generous bucket.
            $key = $request->input('company_id')
                ?: $request->user()?->id
                ?: $request->ip();

            return Limit::perMinute(2000)->by('api:' . $key);
        });
    }
}
