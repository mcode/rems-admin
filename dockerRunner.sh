#!/bin/bash

# Handle closing application on signal interrupt (ctrl + c)
# trap "kill $LOAD_DATA_PID $CONTINUOUS_BUILD_PID $SERVER_PID; gradle --stop; exit" INT

# Set environment variables
export DOCKER_DEV_PROFILE="true"

echo "REMS Server is Booting Up..."
echo "REMS Server Is Running..."

while true
do 
    echo "REMS Server will say this string every 5 minutes..."
    sleep 5m
done

# Handle application background process exiting
# wait $CONTINUOUS_BUILD_PID $SERVER_PID $LOAD_DATA_PID
# EXIT_CODE=$?
# echo "application exited with exit code $EXIT_CODE..."

