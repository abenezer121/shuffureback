mkdir -p ../api
cp -r . ../api
rm -rf ../api/.git
rm -rf ../api/node_modules

sshpass -p "Careers/1@" scp -r ../api root@196.189.91.238:/root/shuufare
sshpass -p "Careers/1@" ssh root@196.189.91.238 -t "/root/shuufare/api/shuufare.sh run"

# sshpass -p "Aqws1234_7" scp -r ../api g2g_admin@197.156.84.246:/home/g2g_admin/shuufare
# sshpass -p "Aqws1234_7" ssh g2g_admin@197.156.84.246 -t "pm2 restart app misc-server"

# sshpass -p "_9%,DSU([@H/69Q(" scp -r ../api g2g_admin@197.156.82.61:/home/g2g_admin/shuu-new-4
# sshpass -p "_9%,DSU([@H/69Q(" ssh g2g_admin@197.156.84.246 -t "pm2 restart app"
