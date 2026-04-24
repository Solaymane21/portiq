<?php
namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminController extends Controller
{
    public function users(): JsonResponse
    {
        $users = User::all();

        return response()->json($users);
    }
}