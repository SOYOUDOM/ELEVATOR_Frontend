// "Production" enabled environment

export const environment = {
    production: true,
    appConfig: 'appconfig.production.json',
    // Required: main.ts and app-initializer both read this, so omitting it
    // failed the production build outright. MSW must never run in production.
    useMocks: false,
};
