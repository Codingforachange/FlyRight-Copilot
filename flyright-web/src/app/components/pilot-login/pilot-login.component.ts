import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pilot-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pilot-login.component.html',
  styleUrl: './pilot-login.component.css'
})
export class PilotLoginComponent {
  @Output() loginSuccess = new EventEmitter<{ pilotName: string; email: string }>();

  pilotName: string = '';
  pilotEmail: string = '';
  authError: string = '';
  isVerifying: boolean = false;

  handleAuthSubmit(): void {
    this.authError = '';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!this.pilotEmail || !emailRegex.test(this.pilotEmail)) {
      this.authError = 'Please enter a valid flight clearance email address.';
      return;
    }

    if (!this.pilotName.trim()) {
      this.authError = 'Pilot name or callsign is required.';
      return;
    }

    this.isVerifying = true;

    // Simulate verification check against authorized subscription records
    setTimeout(() => {
      this.isVerifying = false;
      this.loginSuccess.emit({
        pilotName: this.pilotName.trim(),
        email: this.pilotEmail.trim()
      });
    }, 1200);
  }
}