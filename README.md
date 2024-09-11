
Configure the .env file
````shell

npx dotenvx set REG_USERID "SG123456" -f .env
npx dotenvx set REG_PASSWD "password" -f .env

npx dotenvx set ATT_USERID "SG123456" -f .env
npx dotenvx set ATT_PASSWD "password" -f .env
````


````shell
# perform bulk donation
npm run dms -- -d -f ./data/dms-data.xlsx

# register volunteer
npm run vms -- -o vol -a reg -f ./data/vms-data-volunteer.xlsx -d -r

# register public
npm run vms -- -o non -a reg -f ./data/vms-data-public.xlsx -d -r


# attendance for volunteer
npm run vms -- -o vol -a att -f ./data/vms-data-volunteer.xlsx -d -r

# attendance for public
npm run vms -- -o non -a att -f ./data/vms-data-public.xlsx -d -r
````
