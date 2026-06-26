#!/bin/sh

# Handle closing application on signal interrupt (ctrl + c)
trap 'kill $CONTINUOUS_INSTALL_PID $SERVER_PID $BACKEND_SERVER_PID 2>/dev/null; exit' INT TERM

mkdir -p logs
touch ./logs/frontend_installer.log
touch ./logs/frontend_runner.log
touch ./logs/backend_installer.log
touch ./logs/backend_runner.log

# Reset log file content for new application boot
echo "*** Logs for continuous frontend installer ***" > ./logs/frontend_installer.log
echo "*** Logs for frontend 'npm run start' ***" > ./logs/frontend_runner.log
echo "*** Logs for continuous backend installer ***" > ./logs/backend_installer.log
echo "*** Logs for backend 'npm run start' ***" > ./logs/backend_runner.log

# Print that the application is starting in watch mode
echo "starting application in watch mode..."

# Start the continuous build listener process
echo "starting continuous installers..."

if [ ! -d frontend/node_modules ]; then
    cd frontend
    npm install | tee ../logs/frontend_installer.log
    cd ..
fi

if [ ! -d node_modules ]; then
    npm install | tee ./logs/backend_installer.log
fi

( file_hash() {
    cksum "$1" 2>/dev/null || echo "missing $1"
}

frontend_package_hash=$(file_hash frontend/package.json)
frontend_lock_hash=$(file_hash frontend/package-lock.json)
backend_package_hash=$(file_hash package.json)
backend_lock_hash=$(file_hash package-lock.json)
while sleep 1
do
    new_frontend_package_hash=$(file_hash frontend/package.json)
    new_frontend_lock_hash=$(file_hash frontend/package-lock.json)
    new_backend_package_hash=$(file_hash package.json)
    new_backend_lock_hash=$(file_hash package-lock.json)
    
    if [ "$frontend_package_hash" != "$new_frontend_package_hash" ] || [ "$frontend_lock_hash" != "$new_frontend_lock_hash" ]
    then
        echo "running frontend npm install..."
        cd frontend
        npm install | tee ../logs/frontend_installer.log
        cd ..
        new_frontend_package_hash=$(file_hash frontend/package.json)
        new_frontend_lock_hash=$(file_hash frontend/package-lock.json)
    fi

    if [ "$backend_package_hash" != "$new_backend_package_hash" ] || [ "$backend_lock_hash" != "$new_backend_lock_hash" ]
    then
        echo "running backend npm install..."
        npm install | tee ./logs/backend_installer.log
        new_backend_package_hash=$(file_hash package.json)
        new_backend_lock_hash=$(file_hash package-lock.json)
    fi

    frontend_package_hash=$new_frontend_package_hash
    frontend_lock_hash=$new_frontend_lock_hash
    backend_package_hash=$new_backend_package_hash
    backend_lock_hash=$new_backend_lock_hash

done )  & CONTINUOUS_INSTALL_PID=$!

# Start server process once initial build finishes
cd frontend
( npm run start | tee ../logs/frontend_runner.log ) & SERVER_PID=$!

cd ..
( npm run start | tee ./logs/backend_runner.log ) & BACKEND_SERVER_PID=$!

# Handle application background process exiting
wait $CONTINUOUS_INSTALL_PID $SERVER_PID $BACKEND_SERVER_PID
EXIT_CODE=$?
echo "application exited with exit code $EXIT_CODE..."
