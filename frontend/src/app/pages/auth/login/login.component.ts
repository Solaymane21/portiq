import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RedirectMsg } from '../../../models/redirectMsg.model';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, MatProgressSpinnerModule, NgClass],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit{

  router = inject(Router)
  authService = inject(AuthService)

  passwordVisible: boolean = false;
  confirmPasswordVisible: boolean = false;

  submitted = signal<boolean>(false)
  redirectMessage = signal<RedirectMsg>({msg: '', type: 'info'});

  loginForm = new FormGroup({
    email: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    ]),
    password: new FormControl('', [
      Validators.required
    ])
  });

  ngOnInit(): void {
    this.redirectMessage.set(this.authService.redirectMsg())

    setTimeout(() => {
      this.redirectMessage.set({msg: '', type: 'info'})
    }, 5000);

    this.authService.msgError.set('')
  }

  onSubmit() {
    this.submitted.set(true)
    if(this.loginForm.invalid) return

    this.authService.email.set(this.loginForm.value.email!)
    this.authService.password.set(this.loginForm.value.password!)

    this.authService.onLogin()
  }

  showHidePassword(id: string) {
    const password = document.getElementById(id) as HTMLInputElement;

    password.type = (password.type === 'password') ? 'text' : 'password'

     if (id === 'password') {
      this.passwordVisible = !this.passwordVisible;
    } else {
      this.confirmPasswordVisible = !this.confirmPasswordVisible;
    }
  }
}
