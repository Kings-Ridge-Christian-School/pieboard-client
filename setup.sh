sudo apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates git
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
sudo apt -y install xinit nodejs libnss3-dev libatk-bridge2.0-0 libgtk-3-dev libatspi-dev libcups2 libxss1
sudo apt update
sudo apt remove --purge triggerhappy logrotate dphys-swapfile -y
sudo apt autoremove --purge -y
sed -i ':a;N;$!ba;s/\n/ fastboot noswap ro/g' /boot/cmdline.txt
sudo apt install busybox-syslogd -y
sudo apt remove --purge rsyslog -y
sudo sed -i 's/vfat    defaults/vfat    defaults,ro/g' /etc/fstab
sudo sed -i 's/noatime/noatime,ro/g' /etc/fstab
sudo rm -rf /var/lib/dhcp /var/lib/dhcpcd5 /var/spool /etc/resolv.conf
sudo ln -s /tmp /var/lib/dhcp
sudo ln -s /tmp /var/lib/dhcpcd5
sudo ln -s /tmp /var/spool
sudo touch /tmp/dhcpcd.resolv.conf
sudo ln -s /tmp/dhcpcd.resolv.conf /etc/resolv.conf
sudo sh -c 'echo "nameserver 8.8.8.8" >> /etc/resolv.conf'
sudo rm /var/lib/systemd/random-seed
sudo ln -s /tmp/random-seed /var/lib/systemd/random-seed
sudo sed  '/\[Service\]/a ExecStartPre=/bin/echo "" >/tmp/random-seed' /lib/systemd/system/systemd-random-seed.service > /tmp/rs.service

sudo cp /tmp/rs.service /lib/systemd/system/systemd-random-seed.service
sudo tee -a /etc/bash.bashrc > /dev/null <<EOT
set_bash_prompt() {
    fs_mode=$(mount | sed -n -e "s/^\/dev\/.* on \/ .*(\(r[w|o]\).*/\1/p")
    PS1='\[\033[01;32m\]\u@\h${fs_mode:+($fs_mode)}\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '
}
alias ro='sudo mount -o remount,ro / ; sudo mount -o remount,ro /boot'
alias rw='sudo mount -o remount,rw / ; sudo mount -o remount,rw /boot'
PROMPT_COMMAND=set_bash_prompt
EOT

sudo tee -a /etc/bash.bash_logout > /dev/null <<EOT
mount -o remount,ro /
mount -o remount,ro /boot
EOT


cd ~
git clone https://github.com/kings-ridge-christian-school/pieboard-client --branch v2
cd pieboard-client
npm install

sudo sed -i 's/9600 /9600 --autologin pi /g' /lib/systemd/system/serial-getty@.service
sudo systemctl daemon-reload
sudo tee -a /boot/config.txt > /dev/null <<EOT
disable_overscan=1
EOT

echo "sudo xinit /home/pi/.xinitrc -- -nocursor" > ~/.bash_profile
chmod +x ~/.bash_profile

tee -a ~/.xinitrc > /dev/null <<EOT
xset s off
xset -dpms
xset s noblank
sudo sh -c 'echo "nameserver 8.8.8.8" >> /etc/resolv.conf'
rw
cd pieboard-client && sudo npm start
EOT

sudo reboot