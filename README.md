# uCentralGW UI

## What is this?

The uCentralGW Client is a user interface that lets you monitor and manage devices connected to the [uCentral gateway](https://github.com/Telecominfraproject/wlan-cloud-ucentralgw). To use the interface,
you either need to run it on your machine for [development](#development) or build it for [production](#production).

NOTE: This UI will be evolving as micro services are added to the uCentral program most notably with provisioning, base dashboard, firmware, device management

## Running the solution

### Development

You need to run these commands in the root folder of the project and also have npm installed on your machine.

```
git clone https://github.com/Telecominfraproject/wlan-cloud-ucentralgw-ui
cd wlan-cloud-ucentralgw-ui
npm install
npm run dev
```

### Production

You need to run this in the root folder of the project and also have npm installed on your machine.

```
git clone https://github.com/Telecominfraproject/wlan-cloud-ucentralgw-ui
cd wlan-cloud-ucentralgw-ui
npm install
npm run build
```

Once the build is done, you can move the `build` folder on your server.

### Configuration

You can control the uCentral Security Service URL (uCentralSec) by modifying the ENV variable "VITE_UCENTRALSEC_URL". There is an example .env file located at the root of this repository.
Here are the current default values:

```
VITE_UCENTRALSEC_URL="https://ucentral.dpaas.arilia.com:16001"
```

## Provisioning portal session handoff

The navbar opens the provisioning UI on the same HTTPS host, port 8443, in a new tab.
Both UIs must include the session-handoff change. The bearer session is sent only
through a checked browser message to that exact tab and origin, never in a URL.
The portal keeps it in tab-scoped storage and uses the existing server-side profile
and permission checks. It disconnects its opener after receipt or a five-second
timeout. Direct portal visits continue to use the normal login flow.

Run the sender/receiver regression with the companion provisioning source:

```sh
PORTAL_SESSION_SOURCE=/path/to/wlan-cloud-owprov-ui/src/helpers/controllerSession.ts node test-portal-session.cjs
node test-provisioning-portal.cjs
```
