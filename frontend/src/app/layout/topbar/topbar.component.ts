import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-topbar',
  imports: [RouterLink],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css'
})
export class TopbarComponent implements OnInit {
  authService = inject(AuthService)
  avatar: string = "https://api.dicebear.com/9.x/fun-emoji/svg?seed=q"
  user = this.authService.currentUser;

  ngOnInit(): void {
    const data = this.authService.getUserInfo()

    if(data) {
      const user = JSON.parse(data)
      if(user.avatar) {
        this.avatar = user.avatar
      }
    }
  }

}
