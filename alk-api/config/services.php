<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'countries' => [
        'url' => env('COUNTRIES_API_URL', 'https://restcountries.com/v3.1/all?fields=name'),
    ],

    'mailchimp' => [
        'api_key' => env('MAILCHIMP_API_KEY'),
        'server_prefix' => env('MAILCHIMP_SERVER_PREFIX'),
        'list_id' => env('MAILCHIMP_LIST_ID'),
        'from_name' => env('MAILCHIMP_FROM_NAME', env('MAIL_FROM_NAME', env('APP_NAME', 'Alkamaris'))),
        'reply_to' => env('MAILCHIMP_REPLY_TO', env('MAIL_FROM_ADDRESS')),
    ],

    'overdue_emails_to' => array_filter(
        array_map(
            'trim',
            explode(',', env('OVERDUE_EMAILS_TO', 'info@alkamaris.com'))
        )
    ),
];
