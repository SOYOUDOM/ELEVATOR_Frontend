    import { HttpHandler,HttpResponse, http } from "msw";
    import {handlers as generated} from './generated/handlers';

    export const handlers: HttpHandler[] = [
        http.get('*/AbpUserConfiguration/GetAll',() => HttpResponse.json({
        "result": {
            "multiTenancy": {
                "isEnabled": true,
                "ignoreFeatureCheckForHostUsers": false,
                "sides": {
                    "host": 2,
                    "tenant": 1
                }
            },
            "session": {
                "userId": 1,
                "tenantId": null,
                "impersonatorUserId": null,
                "impersonatorTenantId": null,
                "multiTenancySide": 2
            },
            "localization": {
                "currentCulture": {
                    "name": "en",
                    "displayName": "English"
                },
                "languages": [
                    {
                        "name": "en",
                        "displayName": "English",
                        "icon": "famfamfam-flags us",
                        "isDefault": true,
                        "isDisabled": false,
                        "isRightToLeft": false
                    },
                    {
                        "name": "es-MX",
                        "displayName": "Espa\u00F1ol M\u00E9xico",
                        "icon": "famfamfam-flags mx",
                        "isDefault": false,
                        "isDisabled": false,
                        "isRightToLeft": false
                    },
                    {
                        "name": "fr",
                        "displayName": "Fran\u00E7ais",
                        "icon": "famfamfam-flags fr",
                        "isDefault": false,
                        "isDisabled": false,
                        "isRightToLeft": false
                    },
                    {
                        "name": "de",
                        "displayName": "German",
                        "icon": "famfamfam-flags de",
                        "isDefault": false,
                        "isDisabled": false,
                        "isRightToLeft": false
                    },
                    {
                        "name": "it",
                        "displayName": "Italiano",
                        "icon": "famfamfam-flags it",
                        "isDefault": false,
                        "isDisabled": false,
                        "isRightToLeft": false
                    },
                    {
                        "name": "nl",
                        "displayName": "Nederlands",
                        "icon": "famfamfam-flags nl",
                        "isDefault": false,
                        "isDisabled": false,
                        "isRightToLeft": false
                    },
                    {
                        "name": "pt-BR",
                        "displayName": "Portugu\u00EAs",
                        "icon": "famfamfam-flags br",
                        "isDefault": false,
                        "isDisabled": false,
                        "isRightToLeft": false
                    },
                    {
                        "name": "tr",
                        "displayName": "T\u00FCrk\u00E7e",
                        "icon": "famfamfam-flags tr",
                        "isDefault": false,
                        "isDisabled": false,
                        "isRightToLeft": false
                    },
                    {
                        "name": "ru",
                        "displayName": "\u0420\u0443\u0441\u0441\u043A\u0438\u0439",
                        "icon": "famfamfam-flags ru",
                        "isDefault": false,
                        "isDisabled": false,
                        "isRightToLeft": false
                    },
                    {
                        "name": "ar",
                        "displayName": "\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
                        "icon": "famfamfam-flags sa",
                        "isDefault": false,
                        "isDisabled": false,
                        "isRightToLeft": true
                    },
                    {
                        "name": "fa",
                        "displayName": "\u0641\u0627\u0631\u0633\u06CC",
                        "icon": "famfamfam-flags ir",
                        "isDefault": false,
                        "isDisabled": false,
                        "isRightToLeft": true
                    },
                    {
                        "name": "ja",
                        "displayName": "\u65E5\u672C\u8A9E",
                        "icon": "famfamfam-flags jp",
                        "isDefault": false,
                        "isDisabled": false,
                        "isRightToLeft": false
                    },
                    {
                        "name": "zh-Hans",
                        "displayName": "\u7B80\u4F53\u4E2D\u6587",
                        "icon": "famfamfam-flags cn",
                        "isDefault": false,
                        "isDisabled": false,
                        "isRightToLeft": false
                    }
                ],
                "currentLanguage": {
                    "name": "en",
                    "displayName": "English",
                    "icon": "famfamfam-flags us",
                    "isDefault": true,
                    "isDisabled": false,
                    "isRightToLeft": false
                },
                "sources": [
                    {
                        "name": "Abp",
                        "type": "MultiTenantLocalizationSource"
                    },
                    {
                        "name": "AbpWeb",
                        "type": "MultiTenantLocalizationSource"
                    },
                    {
                        "name": "AbpZero",
                        "type": "MultiTenantLocalizationSource"
                    },
                    {
                        "name": "Elevator",
                        "type": "MultiTenantLocalizationSource"
                    }
                ],
                "values": {
                    "Abp": {
                        "AllOfTheseFeaturesMustBeEnabled": "Required features are not enabled. All of these features must be enabled: {0}",
                        "AllOfThesePermissionsMustBeGranted": "Required permissions are not granted. All of these permissions must be granted: {0}",
                        "AtLeastOneOfTheseFeaturesMustBeEnabled": "Required features are not enabled. At least one of these features must be enabled: {0}",
                        "AtLeastOneOfThesePermissionsMustBeGranted": "Required permissions are not granted. At least one of these permissions must be granted: {0}",
                        "CurrentUserDidNotLoginToTheApplication": "Current user did not login to the application!",
                        "DefaultFromSenderDisplayName": "Default from (sender) display name",
                        "DefaultFromSenderEmailAddress": "Default from (sender) email address",
                        "DefaultLanguage": "Default language",
                        "DomainName": "Domain name",
                        "FeatureIsNotEnabled": "Feature is not enabled: {0}",
                        "MainMenu": "Main menu",
                        "Password": "Password",
                        "ReceiveNotifications": "Receive notifications",
                        "SmtpHost": "SMTP host",
                        "SmtpPort": "SMTP port",
                        "TimeZone": "Timezone",
                        "UseDefaultCredentials": "Use default credentials",
                        "Username": "User name",
                        "UseSSL": "Use SSL"
                    },
                    "AbpWeb": {
                        "AreYouSure": "Are you sure?",
                        "Cancel": "Cancel",
                        "DefaultError": "An error has occurred!",
                        "DefaultError401": "You are not authenticated!",
                        "DefaultError403": "You are not authorized!",
                        "DefaultError404": "Resource not found!",
                        "DefaultErrorDetail": "Error detail not sent by server.",
                        "DefaultErrorDetail401": "You should be authenticated (sign in) in order to perform this operation.",
                        "DefaultErrorDetail403": "You are not allowed to perform this operation.",
                        "DefaultErrorDetail404": "The resource requested could not found on the server.",
                        "EntityNotFound": "There is no entity {0} with id = {1}!",
                        "InternalServerError": "An internal error occurred during your request!",
                        "ValidationError": "Your request is not valid!",
                        "ValidationNarrativeTitle": "The following errors were detected during validation.",
                        "Yes": "Yes"
                    },
                    "AbpZero": {
                        "CanNotDeleteAdminUser": "Can not delete user {0} since this is the default admin user!",
                        "CanNotDeleteStaticRole": "Can not delete a static role: {0}",
                        "CanNotRenameAdminUser": "Can not rename user name of the {0} since this is the default admin user!",
                        "Email": "Email",
                        "EmailSecurityCodeBody": "Your security code is: {0}",
                        "EmailSecurityCodeSubject": "Security Code",
                        "Identity.ConcurrencyFailure": "Optimistic concurrency failure, object has been modified.",
                        "Identity.DefaultError": "An unknown failure has occurred.",
                        "Identity.DuplicateEmail": "Email \u0027{0}\u0027 is already taken.",
                        "Identity.DuplicateRoleName": "Role name \u0027{0}\u0027 is already taken.",
                        "Identity.DuplicateUserName": "Username \u0027{0}\u0027 is already taken.",
                        "Identity.InvalidEmail": "Email \u0027{0}\u0027 is invalid.",
                        "Identity.InvalidPasswordHasherCompatibilityMode": "The provided PasswordHasherCompatibilityMode is invalid.",
                        "Identity.InvalidPasswordHasherIterationCount": "The iteration count must be a positive integer.",
                        "Identity.InvalidRoleName": "Role name \u0027{0}\u0027 is invalid.",
                        "Identity.InvalidToken": "Invalid token.",
                        "Identity.InvalidUserName": "Username \u0027{0}\u0027 is invalid, can only contain letters or digits.",
                        "Identity.LoginAlreadyAssociated": "A user with this login already exists.",
                        "Identity.PasswordMismatch": "Incorrect password.",
                        "Identity.PasswordRequireDigit": "Passwords must have at least one digit (\u00270\u0027-\u00279\u0027).",
                        "Identity.PasswordRequireLower": "Passwords must have at least one lowercase (\u0027a\u0027-\u0027z\u0027).",
                        "Identity.PasswordRequireNonAlphanumeric": "Passwords must have at least one non alphanumeric character.",
                        "Identity.PasswordRequireUpper": "Passwords must have at least one uppercase (\u0027A\u0027-\u0027Z\u0027).",
                        "Identity.PasswordTooShort": "Passwords must be at least {0} characters.",
                        "Identity.RoleNotFound": "Role {0} does not exist.",
                        "Identity.UserAlreadyHasPassword": "User already has a password set.",
                        "Identity.UserAlreadyInRole": "User already in role \u0027{0}\u0027.",
                        "Identity.UserLockedOut": "User is locked out.",
                        "Identity.UserLockoutNotEnabled": "Lockout is not enabled for this user.",
                        "Identity.UserNameNotFound": "User {0} does not exist.",
                        "Identity.UserNotInRole": "User is not in role \u0027{0}\u0027.",
                        "InvalidFeatureValue": "{0} feature value is not valid!",
                        "InvalidTenancyName": "Tenancy name is not valid!",
                        "OrganizationUnitDuplicateDisplayNameWarning": "There is already an organization unit with name {0}. Two units with same name can not be created in same level.",
                        "RoleDisplayNameIsAlreadyTaken": "Role display name {0} is already taken.",
                        "RoleNameIsAlreadyTaken": "Role name {0} is already taken.",
                        "Sms": "Sms",
                        "SmsSecurityCodeMessage": "Your security code is: {0}",
                        "TenancyNameIsAlreadyTaken": "Tenancy name {0} is already taken."
                    },
                    "Elevator": {
                        "403PageButton": "Go back to Dashboard",
                        "403PageDescription": "You don\u0027t have permission to access this resource. Please contact your administrator.",
                        "403PageHeader": "Forbidden",
                        "About": "About",
                        "Actions": "Actions",
                        "AdminEmailAddress": "Admin email address",
                        "Administration": "Administration",
                        "AdminPassword": "Admin password",
                        "All": "All",
                        "AreYouSureWantToDelete": "Are you sure want to delete {0}?",
                        "Back": "Back",
                        "CanBeEmptyToLoginAsHost": "Can be empty to login as host.",
                        "Cancel": "Cancel",
                        "Change": "Change",
                        "ChangeTenant": "Change tenant",
                        "Clear": "Clear",
                        "ClearAll": "Clear all",
                        "ClearOthers": "Clear others",
                        "ConfirmNewPassword": "Confirm New Password",
                        "ConfirmPassword": "Confirm password",
                        "CouldNotCompleteLoginOperation": "Could not complete login operation. Please try again later.",
                        "CouldNotValidateExternalUser": "Could not validate external user",
                        "Create": "Create",
                        "CreateNewRole": "Create new role",
                        "CreateNewTenant": "Create new tenant",
                        "CreateNewUser": "Create new user",
                        "CurrentPassword": "Current Password",
                        "CurrentTenant": "Current tenant",
                        "DatabaseConnectionString": "Database connection string",
                        "DefaultPasswordIs": "Default password is {0}",
                        "Delete": "Delete",
                        "DisplayName": "Display Name",
                        "Edit": "Edit",
                        "EditRole": "Edit role",
                        "EditTenant": "Edit tenant",
                        "EditUser": "Edit user",
                        "EmailAddress": "Email address",
                        "Filter": "Filter",
                        "FormIsNotValidMessage": "Form is not valid. Please check and fix errors.",
                        "FullName": "Full name",
                        "HomePage": "Home page",
                        "InvalidEmailAddress": "Invalid email address",
                        "InvalidPattern": "Invalid",
                        "InvalidUserNameOrPassword": "Invalid user name or password",
                        "IsActive": "Is active",
                        "LabelOptions": "Label options",
                        "LeaveEmptyToSwitchToHost": "Leave empty to switch to the host",
                        "LogIn": "Log in",
                        "LoginFailed": "Login failed!",
                        "Logout": "Logout",
                        "MultiLevelMenu": "Multi Level Menu",
                        "Name": "Name",
                        "NameSurname": "Name surname",
                        "NewPassword": "New Password",
                        "No": "No",
                        "NotSelected": "Not selected",
                        "Off": "Off",
                        "On": "On",
                        "Optional": "Optional",
                        "OrLoginWith": "Or login with",
                        "PairsDoNotMatch": "Do not match",
                        "Password": "Password",
                        "PasswordsDoNotMatch": "Passwords do not match",
                        "PasswordsMustBeAtLeast8CharactersContainLowercaseUppercaseNumber": "Passwords must be at least 8 characters, contain a lowercase, uppercase, and number",
                        "Permissions": "Permissions",
                        "PleaseEnterAtLeastNCharacter": "Please enter at least {0} characters",
                        "PleaseEnterLoginInformation": "Please enter login information",
                        "PleaseEnterNoMoreThanNCharacter": "Please enter no more than {0} characters",
                        "PleaseWait": "Please wait...",
                        "Refresh": "Refresh",
                        "Register": "Register",
                        "RegisterFormUserNameInvalidMessage": "Please don\u0027t enter an email address for username.",
                        "RememberMe": "Remember me",
                        "ResetPassword": "Reset Password",
                        "ResetPasswordStepOneInfo": "1. Enter your administrator password",
                        "ResetPasswordStepTwoInfo": "2. Copy this random password so you can send it to the user",
                        "RoleDeleteWarningMessage": "Role {0} will be deleted and unassigned from all assigned users.",
                        "RoleDescription": "Role description",
                        "RoleName": "Role Name",
                        "Roles": "Roles",
                        "Save": "Save",
                        "SavedSuccessfully": "Saved successfully",
                        "Search": "Search",
                        "SearchWithThreeDot": "Search...",
                        "Settings": "Settings",
                        "Skins": "Skins",
                        "StartTyping": "Start Typing",
                        "SuccessfullyDeleted": "Successfully deleted",
                        "SuccessfullyRegistered": "Successfully registered",
                        "Surname": "Surname",
                        "TenancyName": "Tenancy name",
                        "TenantDeleteWarningMessage": "Tenant {0} will be deleted.",
                        "TenantIdIsNotActive{0}": "TenantId {0} is not active",
                        "TenantIsNotActive": "Tenant {0} is not active.",
                        "TenantName_Regex_Description": "Tenant name must be at least 2 chars, starts with a letter and continue with letter, number, dash or underscore.",
                        "TenantNameCanNotBeEmpty": "Tenant name can not be empty",
                        "Tenants": "Tenants",
                        "TenantSelection": "Tenant Selection",
                        "TenantSelection_Detail": "Please select one of the following tenants.",
                        "ThereIsNoTenantDefinedWithName{0}": "There is no tenant defined with name {0}",
                        "ThisFieldIsRequired": "This field is required",
                        "TotalRecordsCount": "Total: {0}",
                        "UnknownTenantId{0}": "Unknown tenantId {0}",
                        "UpdatePassword": "Update Password",
                        "UserDeleteWarningMessage": "User {0} will be deleted.",
                        "UserDetails": "User details",
                        "UserEmailIsNotConfirmedAndCanNotLogin": "Your email address is not confirmed. You can not login.",
                        "UserIsNotActiveAndCanNotLogin": "User {0} is not active and can not log in.",
                        "UserLockedOutMessage": "The user account has been locked out. Please try again later.",
                        "UserName": "User name",
                        "UserNameOrEmail": "User name or email",
                        "UserRoles": "User roles",
                        "Users": "Users",
                        "UsersActivation": "Users activation",
                        "Version": "Version",
                        "WaitingForActivationMessage": "Your account is waiting to be activated by system admin.",
                        "WaitingForEmailActivation": "Your email address should be activated",
                        "WelcomeMessage": "Welcome to Elevator!",
                        "Yes": "Yes"
                    }
                }
            },
            "features": {
                "allFeatures": {}
            },
            "auth": {
                "allPermissions": {
                    "Pages.Users": "true",
                    "Pages.Users.Activation": "true",
                    "Pages.Roles": "true",
                    "Pages.Tenants": "true"
                },
                "grantedPermissions": {
                    "Pages.Users": "true",
                    "Pages.Users.Activation": "true",
                    "Pages.Roles": "true",
                    "Pages.Tenants": "true"
                }
            },
            "nav": {
                "menus": {
                    "MainMenu": {
                        "name": "MainMenu",
                        "displayName": "Main menu",
                        "customData": null,
                        "items": []
                    }
                }
            },
            "setting": {
                "values": {
                    "Abp.Localization.DefaultLanguageName": "en",
                    "Abp.Notifications.ReceiveNotifications": "true",
                    "Abp.Timing.TimeZone": "UTC",
                    "Abp.Zero.UserManagement.IsEmailConfirmationRequiredForLogin": "false",
                    "Abp.Zero.OrganizationUnits.MaxUserMembershipCount": "2147483647",
                    "Abp.Zero.UserManagement.TwoFactorLogin.IsEnabled": "true",
                    "Abp.Zero.UserManagement.TwoFactorLogin.IsRememberBrowserEnabled": "true",
                    "Abp.Zero.UserManagement.TwoFactorLogin.IsEmailProviderEnabled": "true",
                    "Abp.Zero.UserManagement.TwoFactorLogin.IsSmsProviderEnabled": "true",
                    "Abp.Zero.UserManagement.UserLockOut.IsEnabled": "true",
                    "Abp.Zero.UserManagement.UserLockOut.MaxFailedAccessAttemptsBeforeLockout": "5",
                    "Abp.Zero.UserManagement.UserLockOut.DefaultAccountLockoutSeconds": "300",
                    "Abp.Zero.UserManagement.PasswordComplexity.RequireDigit": "false",
                    "Abp.Zero.UserManagement.PasswordComplexity.RequireLowercase": "false",
                    "Abp.Zero.UserManagement.PasswordComplexity.RequireNonAlphanumeric": "false",
                    "Abp.Zero.UserManagement.PasswordComplexity.RequireUppercase": "false",
                    "Abp.Zero.UserManagement.PasswordComplexity.RequiredLength": "6",
                    "App.UiTheme": "red"
                }
            },
            "clock": {
                "provider": "unspecifiedClockProvider"
            },
            "timing": {
                "timeZoneInfo": {
                    "windows": {
                        "timeZoneId": "UTC",
                        "baseUtcOffsetInMilliseconds": 0,
                        "currentUtcOffsetInMilliseconds": 0,
                        "isDaylightSavingTimeNow": false
                    },
                    "iana": {
                        "timeZoneId": "Etc/UTC"
                    }
                }
            },
            "security": {
                "antiForgery": {
                    "tokenCookieName": "XSRF-TOKEN",
                    "tokenHeaderName": "X-XSRF-TOKEN"
                }
            },
            "custom": {}
        },
        "targetUrl": null,
        "success": true,
        "error": null,
        "unAuthorizedRequest": false,
        "__abp": true
    })),

    http.get('*/api/services/app/Session/GetCurrentLoginInformations',() => HttpResponse.json({
        "result": {
            "application": {
                "version": "9.3.0",
                "releaseDate": "2026-05-24T02:26:09.4970598+07:00",
                "features": {}
            },
            "user": {
                "name": "Oudom",
                "surname": "Soy",
                "userName": "Oudom",
                "emailAddress": "admin@aspnetboilerplate.com",
                "id": 1
            },
            "tenant": null
        },
        "targetUrl": null,
        "success": true,
        "error": null,
        "unAuthorizedRequest": false,
        "__abp": true
    })),
        ...generated,
    ];
