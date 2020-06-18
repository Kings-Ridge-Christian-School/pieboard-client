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
sudo apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates git
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
sudo apt -y install xinit nodejs npm libcursor1 libnss3-dev x11-server-utils libatk-bridge2.0-0 libgtk-3-dev libatspi-dev libcups2 libxss1
```
in some cases the above commands may fail (pi zero), in which case the following may help
```
sudo apt -y install xinit nodejs npm libxcursor1 libnss3-dev x11-xserver-utils libatk-bridge2.0-0 libgtk-3-dev libatspi-dev libcups2 libxss1
```
2. in `raspi-config`, display should be forced 1920x1080, and autologin to console should be selected
3. place `.bash_profile` and `.xinitrc` in the home folder (most likely `/home/pi`), with `+x` permissions (can be set with `chmod +x [filename]`)
*Note: these two files will be automatically updated*