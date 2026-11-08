import { Injectable } from '@angular/core';
import { Purchases, PurchasesPackage, CustomerInfo } from '@revenuecat/purchases-capacitor';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private readonly apiKey = 'test_YyLfJkfjACiHRLmwvSLBEJlwYgB';
  private readonly entitlementId = 'pro_access';

  // State observables for the UI
  public isPro$ = new BehaviorSubject<boolean>(false);
  public offerings$ = new BehaviorSubject<PurchasesPackage[]>([]);

  constructor() {
    this.init();
  }

  async init(): Promise<void> {
    try {
      await Purchases.configure({ apiKey: this.apiKey });
      await this.checkSubscriptionStatus();
      await this.loadOfferings();
    } catch (err) {
      console.warn('RevenueCat init skipped (running in browser or offline):', err);
    }
  }

  async checkSubscriptionStatus(): Promise<boolean> {
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      const hasPro = typeof customerInfo.entitlements.active[this.entitlementId] !== 'undefined';
      this.isPro$.next(hasPro);
      return hasPro;
    } catch (err) {
      console.error('Failed to get customer info:', err);
      return false;
    }
  }

  async loadOfferings(): Promise<void> {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current && offerings.current.availablePackages.length > 0) {
        this.offerings$.next(offerings.current.availablePackages);
        return;
      }
    } catch (err) {
      console.warn('Native RevenueCat offerings unavailable (running in web browser). Using dev fallback packages.', err);
    }

    // Dev fallback packages so the UI renders fully on localhost/web:
    const mockPackages: any[] = [
      {
        identifier: '$rc_monthly',
        packageType: 'MONTHLY',
        product: { identifier: 'flyright_999_1m', title: 'Monthly Access', priceString: '$9.99/mo' }
      },
      {
        identifier: '$rc_six_month',
        packageType: 'SIX_MONTH',
        product: { identifier: 'flyright_4900_6m', title: '6-Month Pass', priceString: '$49.00' }
      },
      {
        identifier: '$rc_annual',
        packageType: 'ANNUAL',
        product: { identifier: 'flyright_7900_1y', title: 'Annual Pro', priceString: '$79.00/yr' }
      }
    ];
    this.offerings$.next(mockPackages as PurchasesPackage[]);
  }


  async purchase(pkg: PurchasesPackage): Promise<boolean> {
    try {
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
      const hasPro = typeof customerInfo.entitlements.active[this.entitlementId] !== 'undefined';
      this.isPro$.next(hasPro);
      return hasPro;
    } catch (err: any) {
      if (!err.userCancelled) {
        console.error('Purchase failed:', err);
      }
      return false;
    }
  }

  async restorePurchases(): Promise<boolean> {
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      const hasPro = typeof customerInfo.entitlements.active[this.entitlementId] !== 'undefined';
      this.isPro$.next(hasPro);
      return hasPro;
    } catch (err) {
      console.error('Restore purchases failed:', err);
      return false;
    }
  }
}
