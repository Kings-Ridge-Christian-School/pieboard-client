sudo apt update
sudo apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates git
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
sudo apt -y install xinit nodejs libnss3-dev libatk-bridge2.0-0 libgtk-3-dev libatspi-dev libcups2 libxss1 x11-xserver-utils ntp
sudo apt remove --purge triggerhappy logrotate dphys-swapfile -y
sudo apt autoremove --purge -y
sudo sed -i 's/rootwait/rootwait fastboot noswap ro/g' /boot/cmdline.txt
sudo sed -i 's/allowed_users=console/allowed_users=anybody/g' /etc/X11/Xwrapper.config

sudo apt install busybox-syslogd -y
sudo apt remove --purge rsyslog -y
sudo sed -i 's/vfat    defaults/vfat    defaults,ro/g' /etc/fstab

sudo tee -a /etc/fstab > /dev/null <<EOT
tmpfs        /tmp            tmpfs   mode=1777,nosuid,nodev,exec         0       0
tmpfs        /var/log        tmpfs   mode=1777,nosuid,nodev,exec         0       0
tmpfs        /var/tmp        tmpfs   mode=1777,nosuid,nodev,exec         0       0
EOT

sudo sed -i 's/noatime/noatime,ro/g' /etc/fstab
sudo rm -rf /var/lib/dhcp /var/lib/dhcpcd5 /var/spool /etc/resolv.conf /home/pi/.Xauthority
sudo ln -s /tmp/dhcp /var/lib/dhcp
sudo ln -s /tmp/dhcpcd5 /var/lib/dhcpcd5
sudo ln -s /tmp/spool /var/spool
sudo ln -s /tmp/.Xauthority /home/pi/.Xauthority
sudo touch /tmp/dhcpcd.resolv.conf
sudo ln -s /tmp/dhcpcd.resolv.conf /etc/resolv.conf
sudo sh -c 'echo "pieboard" > /etc/hostname'


sudo rm /var/lib/systemd/random-seed
sudo ln -s /tmp/random-seed /var/lib/systemd/random-seed
sudo sed  '/\[Service\]/a ExecStartPre=/bin/echo "" >/tmp/random-seed' /lib/systemd/system/systemd-random-seed.service > /tmp/rs.service

sudo cp /tmp/rs.service /lib/systemd/system/systemd-random-seed.service

sudo sh -c 'echo "sudo mount -o remount,ro / ; sudo mount -o remount,ro /boot" > /bin/ro'
sudo sh -c 'echo "sudo mount -o remount,rw / ; sudo mount -o remount,rw /boot" > /bin/rw'

sudo chmod +x /bin/ro /bin/rw

sudo tee -a /etc/bash.bash_logout > /dev/null <<EOT
mount -o remount,ro /
mount -o remount,ro /boot
EOT


cd ~
git clone https://github.com/kings-ridge-christian-school/pieboard-client
cd pieboard-client
npm install

sudo systemctl set-default multi-user.target
sudo ln -fs /lib/systemd/system/getty@.service /etc/systemd/system/getty.target.wants/getty@tty1.service
sudo tee -a /etc/systemd/system/getty@tty1.service.d/autologin.conf > /dev/null <<EOT
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin pi --noclear %I \$TERM
EOT

sudo systemctl daemon-reload
sudo tee -a /boot/config.txt > /dev/null <<EOT
disable_overscan=1
EOT

echo "sudo xinit /home/pi/.xinitrc -- -nocursor" > ~/.bash_profile
chmod +x ~/.bash_profile

tee ~/.xinitrc > /dev/null <<EOT
xset s off
xset -dpms
xset s noblank
rw
sudo service ntp stop
sudo ntpdate -s time.nist.gov
sudo service ntp start
ro
cd pieboard-client && npm start
EOT

sudo timedatectl set-timezone GMT+0

sudo reboot