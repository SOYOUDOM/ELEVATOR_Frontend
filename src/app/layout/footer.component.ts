import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

interface FooterLink { label: string; to: string; }
interface FooterCol  { floor: string; label: string; links: FooterLink[]; }

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [RouterLink],
})
export class FooterComponent {
  brandLetters = 'LEVATOR'.split('');
  year = new Date().getFullYear();

  columns: FooterCol[] = [
    {
      floor: '03',
      label: 'Studio',
      links: [
        { label: 'Create CV',       to: '/app/create-cv' },
        { label: 'Templates',       to: '/app/templates' },
        { label: 'Studio Headshot', to: '/app/headshot' },
        { label: 'ATS Check',       to: '/app/ats' },
        { label: 'AI Writer',       to: '/app/ai-writer' },
      ],
    },
    {
      floor: '02',
      label: 'Company',
      links: [
        { label: 'About',        to: '/app/about' },
        { label: 'How It Works', to: '/app/about' },
        { label: 'Roadmap',      to: '/app/about' },
        { label: 'Contact',      to: '/app/about' },
      ],
    },
    {
      floor: '01',
      label: 'Legal',
      links: [
        { label: 'Privacy Policy',    to: '/app/privacy' },
        { label: 'Terms & Conditions', to: '/app/terms' },
        { label: 'Cookie Policy',      to: '/app/privacy' },
      ],
    },
  ];

  socials = [
    { icon: 'fa-brands fa-facebook-f',  label: 'Facebook', href: 'https://web.facebook.com/soy.udom.54584/' },
    { icon: 'fa-brands fa-telegram',    label: 'Telegram', href: 'https://t.me/SOYUDOM' },
    { icon: 'fa-brands fa-linkedin-in', label: 'LinkedIn', href: 'https://www.linkedin.com/in/soy-oudom/' },
    { icon: 'fa-brands fa-github',      label: 'GitHub',   href: 'https://github.com/SOYOUDOM' },
  ];
}