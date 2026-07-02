import { Component, Injector, ChangeDetectionStrategy } from '@angular/core';
import { AppComponentBase } from '@shared/app-component-base';
import { appModuleAnimation } from '@shared/animations/routerTransition';
import { LocalizePipe } from '@shared/pipes/localize.pipe';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { FormsModule } from '@node_modules/@angular/forms';

@Component({
    templateUrl: './home.component.html',
    animations: [appModuleAnimation()],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        // LocalizePipe,
        ButtonModule,
        CardModule,
        InputTextModule,
        TableModule,
        IconFieldModule,
        InputIconModule,
        ToggleButtonModule,
        FormsModule,
    ],
})
export class HomeComponent extends AppComponentBase {
    checked: boolean = false;
    constructor(injector: Injector) {
        super(injector);
    }
    toggleTheme() {
        document.documentElement.classList.toggle('app-dark');
        console.log(this.checked);
    }
}
