#!/bin/bash
# Deploy Strapi with Docker Compose
function start(){
    cd /home/vscodeuser/wk/blog-cms
    sudo docker compose -f ./docker-compose.yml up -d --build
}
# To view logs, uncomment the line below
#sudo docker logs blog_strapi
# To stop the containers, uncomment the line below
function stop(){
    sudo docker compose -f ./docker-compose.yml down -v
}

echo "Strapi deployment script executed."

# switch case
case "$1" in
    'start')
        start
    ;;
    'stop')
        stop
    ;;
    *)
        echo "Usage: $0 {start|stop}"
    ;;
esac