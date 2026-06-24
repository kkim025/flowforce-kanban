#!/bin/bash

echo "--- Running API tests ---"
(cd api && npm test)
api_status=$?

echo -e "\n--- Running Web tests ---"
(cd web && npm test -- --run)
web_status=$?

if [ $api_status -eq 0 ] && [ $web_status -eq 0 ]; then
    echo -e "\nAll tests passed!"
    exit 0
else
    echo -e "\nSome tests failed."
    exit 1
fi
