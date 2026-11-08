import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubscriptionService } from '../../services/subscription.service';
import { PurchasesPackage } from '@revenuecat/purchases-capacitor';

@Component({
  selector: 'app-paywall',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paywall.component.html',
  styleUrls: ['./paywall.component.css']
})
export class PaywallComponent {
  @Output() close = new EventEmitter<void>();
  loading = false;
  selectedPackage: PurchasesPackage | null = null;

  constructor(public subService: SubscriptionService) {
    this.subService.loadOfferings();
    this.subService.offerings$.subscribe(packages => {
      if (packages.length > 0 && !this.selectedPackage) {
        // Default select Annual or the first option
        const annual = packages.find(p => p.identifier === '$rc_annual');
        this.selectedPackage = annual || packages[0];
      }
    });
  }

  selectPackage(pkg: PurchasesPackage): void {
    this.selectedPackage = pkg;
  }

  async onPurchase(): Promise<void> {
    if (!this.selectedPackage) return;
    this.loading = true;
    const success = await this.subService.purchase(this.selectedPackage);
    this.loading = false;
    if (success) {
      this.close.emit();
    }
  }

  async onRestore(): Promise<void> {
    this.loading = true;
    const success = await this.subService.restorePurchases();
    this.loading = false;
    if (success) {
      this.close.emit();
    }
  }

  onDismiss(): void {
    this.close.emit();
  }
}