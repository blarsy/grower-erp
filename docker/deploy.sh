# make sure you upload your SSH key to the target server first:
# ssh-copy-id -i ~/.ssh/id_rsa.pub YOUR_USER_NAME@IP_ADDRESS_OF_THE_SERVER

ssh root@83.229.83.107 "mkdir -p /home/grower-erp;"
# copy settings file
scp -rp ./../.env.production root@83.229.83.107:/home/grower-erp
# copy non-hidden files
scp -rp * root@83.229.83.107:/home/grower-erp
ssh root@83.229.83.107 "cd /home/grower-erp/prod;docker-compose up -d;"