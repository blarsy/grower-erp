# make sure you upload your SSH key to the target server first:
# ssh-copy-id -i ~/.ssh/id_rsa.pub YOUR_USER_NAME@IP_ADDRESS_OF_THE_SERVER

ssh root@83.229.83.107 "mkdir -p /home/homeostasis-erp;"
# copy settings file
scp -rp ./.env.production root@83.229.83.107:/home/homeostasis-erp
# copy non-hidden files
scp -rp lib/ pages/ public/ docker/ *.js *.json *.graphql *.ts yarn.lock root@83.229.83.107:/home/homeostasis-erp
ssh root@83.229.83.107 "cd /home/homeostasis-erp/docker/prod;docker-compose down; docker-compose build;docker-compose up -d;"