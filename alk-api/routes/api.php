<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\ProfileController;
use App\Http\Controllers\Api\ConfigController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\TransactionDocumentController;
use App\Http\Controllers\Api\TransactionItemController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::get('configs/{type}/options', [ConfigController::class, 'options']);
Route::get('countries/options', [ConfigController::class, 'countries']);

Route::prefix('auth')->group(function (): void {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
        Route::patch('profile', [ProfileController::class, 'update']);
        Route::patch('password', [ProfileController::class, 'updatePassword']);
    });
});

Route::middleware(['auth:sanctum', 'role:admin'])->group(function (): void {
    Route::apiResource('configs', ConfigController::class)->except(['create', 'edit']);
    Route::apiResource('users', UserController::class)->except(['create', 'edit']);
    Route::post('transactions/{transaction}/documents/render', [TransactionDocumentController::class, 'render']);
    Route::get('transaction-item-options', [TransactionItemController::class, 'options']);
    Route::post('transactions/{transaction}/items', [TransactionItemController::class, 'store']);
    Route::put('transactions/{transaction}/items/{item}', [TransactionItemController::class, 'update']);
    Route::delete('transactions/{transaction}/items/{item}', [TransactionItemController::class, 'destroy']);
    Route::post('transactions/{transaction}/items/{item}/duplicate', [TransactionItemController::class, 'duplicate']);
    Route::post('transactions/{transaction}/items/{item}/move', [TransactionItemController::class, 'move']);
});

Route::middleware('auth:sanctum')->group(function (): void {
    Route::apiResource('transactions', TransactionController::class)->only(['index', 'show', 'store', 'update']);
    Route::post('transactions/{transaction}/duplicate', [TransactionController::class, 'duplicate']);
});
