# PieBoard Client

configuration requires the following
1. instructions in `server-files/README.md` have the information about which files to put where
2. reboot or run once so the client can be set up.
3. An `.env` should be made and must be put in to `client/`. Without this file, no password will be defined
```
AUTH_CODE=""        # passcode used for communications, can be anything. A blank string is default, if not defined a warning will be shown
GLOBAL_PORT=3030    # this is the port where the server sends data to the client, default is 3030.
NOSLIDE_WARNING=true# if true, a warning will be shown if the client has no slides, defauly is true
```
3. set the timezone if needed, default is UTC+0