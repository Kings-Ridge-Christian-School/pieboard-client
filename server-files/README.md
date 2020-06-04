# Server Files
these files are used for RPi configuration


## .bash_profile
this profile starts the X server if the current display is tty1, it starts the X server with `.xinitrc`

## .xinitrc
this file makes sure the system is up to date and is cloned properly, this then starts the system

## Installation
the following should be used to configure a device
1. Run the following
```
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
apt install xinit nodejs
```
2. in `raspi-config`, display should be forced 1920x1080, and autologin to console should be selected
3. place `.bash_profile` and `.xinitrc` in the home folder (most likely `/home/pi`), with `+x` permissions (can be set with `chmod +x [filename]`)
