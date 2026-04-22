Installation

===================================================================================
===Laravel (Backend)===
composer install
composer require laravel/socialite
php artisan key:generate
composer require laravel/cashier

===================================================================================
===Angular (Frontend)===
npm install
ng add @angular/material
npm install ng-apexcharts@1.11.0 --save --legacy-peer-deps

===================================================================================
===Python (FastAPI Service)===
python -m venv venv
.\venv\Scripts\activate
pip install yfinance fastapi uvicorn scikit-learn pandas numpy
uvicorn main:app --reload --port 8001

===================================================================================
Usage
Make sure all three services are running before using the application.

