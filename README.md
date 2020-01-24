# PieBoard Client

configuration requires the following
1. instructions in `server-files/README.md` to be followed, and files to be copied from there
2. a `.env` file to be made with the following
```
AUTH_CODE=""        # passcode used for communications, can be anything
GLOBAL_PORT=3030    # port used by server to communicate
LOCAL_PORT=3333     # port used for local image display, this value does not control what is in `server-files/run.sh`
```