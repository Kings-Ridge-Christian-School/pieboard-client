pkill node
cd /home/pi/pieboard-client
node app &
sudo xinit /home/pi/.xinitrc -- -nocursor > /home/pi/log