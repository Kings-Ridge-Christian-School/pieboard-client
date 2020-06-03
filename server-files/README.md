# Server Files
these files are used for RPi configuration

## Commands
the following should be used to configure a device
```
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
apt install xinit nodejs
```
in `raspi-config`, display should be forced 1920x1080, and autologin to console should be selected

## .bash_profile
this profile starts the X server if the current display is tty1, it starts the X server with `.xinitrc`

## .xinitrc
this file controls what the X server does and starts the PieBoard service, which will disable sleep, update NPM packages, and start the app


*all files should be `+x` permission for execution*