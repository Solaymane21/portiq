import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { AuthService } from '../../../../../services/auth.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-register-verification',
  imports: [ReactiveFormsModule, MatProgressSpinnerModule],
  templateUrl: './register-verification.component.html',
  styleUrl: './register-verification.component.css'
})
export class RegisterVerificationComponent implements OnInit {
  authService = inject(AuthService)
  isResentCode = signal<boolean>(false)
  email: string = ''
  countdown = signal<number>(30);

  passwordVisible: boolean = false;
  confirmPasswordVisible: boolean = false;

  registerForm = new FormGroup({
    code: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9]{6}$/)
    ])
  })

  ngOnInit(): void {
    this.email = this.authService.email();
  }

  onResendCode() {
    this.isResentCode.set(true)
    this.startCountDown()

    this.authService.onResendCode().subscribe({
      next: () => {},
      error: (err) => {
        console.error(err);
        this.isResentCode.set(false);
      }
    });
  }

  startCountDown() {
    this.countdown.set(30)

    const interval = setInterval(() => {
      this.countdown.update(time => Math.max(time - 1, 0))

      if (this.countdown() <= 0) {
        clearInterval(interval)
        this.isResentCode.set(false)
      }
    }, 1000);
  }

  next() {
    if (this.registerForm.invalid) return;

    this.authService.code.set(this.registerForm.value.code!)

    this.authService.onStep2()
  }

}
