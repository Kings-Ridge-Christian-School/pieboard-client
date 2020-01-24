# Server Files
these files are used for RPi configuration

## Commands
the following should be used to configure a device
```
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
apt install vim xinit nodejs chromium-browser
```
in `raspi-config`, display should be forced 1920x1080, and autologin to console should be selected

## .bash_profile
this profile starts the X server if the current display is tty1, it starts  `init.sh`

## init.sh
this file starts nodejs and the X server, which is in `.xinitrc`

## .xinitrc
this file controls what the X server does, which will disable sleep and run `run.sh`

## run.sh
this file starts chromium, and ends the initialization process

*all files should be `+x` permission for execution*