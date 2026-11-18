import { Routes } from '@angular/router';
import { AccessPageComponent } from './features/access/access-page.component';
import { WorkOrderPageComponent } from './features/workorder/work-order-page.component';
import { PlannedWorkPageComponent } from './features/workorder/planned-work-page.component';
import { providerSessionGuard } from './core/guards/provider-session.guard';

export const routes: Routes = [
  { path: '', component: AccessPageComponent },
  { path: 'work-order', component: WorkOrderPageComponent, canActivate: [providerSessionGuard] },
  { path: 'work-order/planned-work', component: PlannedWorkPageComponent, canActivate: [providerSessionGuard] },
  { path: 'work-order/closure', component: WorkOrderPageComponent, canActivate: [providerSessionGuard] },
];
