## [web-v1.2.0](https://github.com/raulgcode/licensebox/compare/web-v1.1.0...web-v1.2.0) (2026-03-24)

### ✨ Features

* **audit:** implement audit logging system ([0e7bc67](https://github.com/raulgcode/licensebox/commit/0e7bc67c844e4ea564e00673863d58ef933af881))

### 🐛 Bug Fixes

* update lastResult handling in NewClientPage for correct form submission state ([5a784ae](https://github.com/raulgcode/licensebox/commit/5a784ae9d660746755624a3a0934aa556b89e033))
* **web:** update date input type for expiration fields to improve user experience ([8bea4f8](https://github.com/raulgcode/licensebox/commit/8bea4f8ba1c8939f1ff228fc01f910be249b1a80))

## [web-v1.1.0](https://github.com/raulgcode/licensebox/compare/web-v1.0.0...web-v1.1.0) (2026-03-07)

### ✨ Features

* add machineId to offline license payload and update related API responses ([c6fccd9](https://github.com/raulgcode/licensebox/commit/c6fccd948e4a2ae2bb609c0666671279cff2ba60))
* add maxUsers and generateOfflineToken fields to license forms and implement offline token generation ([aa63e19](https://github.com/raulgcode/licensebox/commit/aa63e19c0b80aa48ba62b9b3127484dffd621cc9))
* **auth:** add forgot and reset password functionality ([0bfcedf](https://github.com/raulgcode/licensebox/commit/0bfcedf11d66b720deb56a2bc5df6a42ba017e4d))
* update ([9f59256](https://github.com/raulgcode/licensebox/commit/9f59256f9cb7b17d8bb36e90b8c0a63f8f6d13ff))

## web-v1.0.0 (2026-02-03)

### ✨ Features

* add client and license management features ([23ae7b6](https://github.com/raulgcode/licensebox/commit/23ae7b6359dad735e797d9a1ac52b85fee3cf6c0))
* add ClientSecretModal component and dialog UI components ([ac2baca](https://github.com/raulgcode/licensebox/commit/ac2bacac5ed74d49d21d2e221d6737fc9b88e912))
* add ErrorList component for displaying form errors ([6b8ef36](https://github.com/raulgcode/licensebox/commit/6b8ef36dc6edc6a1380130ded47c124951b9662f))
* add fresh install script and documentation; update admin credentials in setup script ([5ca3223](https://github.com/raulgcode/licensebox/commit/5ca32237a3d3ba56dc27940d526ef56a798e20af))
* Add the the ci-cd deployments workflows ([deef80d](https://github.com/raulgcode/licensebox/commit/deef80dbf8c47de28a91ff9dfc66cab459a5d5cb))
* **auth:** implement JWT-based authentication system ([3ddaace](https://github.com/raulgcode/licensebox/commit/3ddaace2d212727a9c6821e97a559bb1ee6d3e91))
* Enhance API with Swagger documentation and DTO improvements ([22c7888](https://github.com/raulgcode/licensebox/commit/22c7888ac01482f68aef3e2f790d2cb54d312922))
* enhance login form with navigation state handling and loading indicators ([b6f8fd5](https://github.com/raulgcode/licensebox/commit/b6f8fd55e4b0cc53904e10cfaabd31b72d895905))
* implement change password functionality and enhance UI with loading states ([7b5321d](https://github.com/raulgcode/licensebox/commit/7b5321d6c3780f5ab98762f4c8bec70aeff49c86))
* initialize LicenseBox project with NestJS, React, and PostgreSQL setup ([b12aba6](https://github.com/raulgcode/licensebox/commit/b12aba6bdbc81eb6f138d48ee6c8077f7f7e6644))
* Refactor code structure for improved readability and maintainability ([9258892](https://github.com/raulgcode/licensebox/commit/92588922ddb3380bbc8d4612430ae6e6ea15da52))
* update admin credentials and enhance database seeding process ([e34c34e](https://github.com/raulgcode/licensebox/commit/e34c34eaf9e71cfb0e319b45fa84bde4898addbb))

### 🐛 Bug Fixes

* add playwright as direct dependency for browser installation ([e7f7442](https://github.com/raulgcode/licensebox/commit/e7f7442fb4192b89b2a111dab11f6887985f6fc6))
* configure Playwright to run in headless mode in CI environments ([8f5fcc5](https://github.com/raulgcode/licensebox/commit/8f5fcc5442b3dcf2aa6d5d9b8548e46ca3e26295))

### ♻️ Code Refactoring

* enhance UI components and improve layout for client management ([e67c4d0](https://github.com/raulgcode/licensebox/commit/e67c4d0ff975ee69ebe68cfaf56af31b1f4b5d67))
* improve code formatting and readability in client and license edit pages ([c2428cd](https://github.com/raulgcode/licensebox/commit/c2428cd13fd702d895ac503516bf7a1c96cb28c4))
* improve formatting of getLicenseCardStyles function parameters ([50206b3](https://github.com/raulgcode/licensebox/commit/50206b338e0ddc84a96ff3c55559b712a886c25f))
