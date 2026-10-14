#!/usr/bin/env python3
"""
Verification script for Step 4: Backend verification.
Tests:
- Creating two test users
- Cross-user access isolation
- Validation of inputs
- Rate limiting on auth endpoints
- Cleanup of test users and data
"""
import requests
import json
import sys
import time

BASE_URL = "http://localhost:8000"

def register_user(username, password):
    url = f"{BASE_URL}/auth/register"
    data = {"username": username, "password": password}
    resp = requests.post(url, data=data)
    return resp

def login_user(username, password):
    url = f"{BASE_URL}/auth/login"
    data = {"username": username, "password": password}
    resp = requests.post(url, data=data)
    return resp

def get_me(cookie):
    url = f"{BASE_URL}/auth/me"
    cookies = {"access_token": cookie}
    resp = requests.get(url, cookies=cookies)
    return resp

def create_transaction(cookie, trans_data):
    url = f"{BASE_URL}/transactions/"
    cookies = {"access_token": cookie}
    headers = {"Content-Type": "application/json"}
    resp = requests.post(url, cookies=cookies, headers=headers, data=json.dumps(trans_data))
    return resp

def get_transactions(cookie):
    url = f"{BASE_URL}/transactions/"
    cookies = {"access_token": cookie}
    resp = requests.get(url, cookies=cookies)
    return resp

def delete_transaction(cookie, trans_id):
    url = f"{BASE_URL}/transactions/{trans_id}"
    cookies = {"access_token": cookie}
    resp = requests.delete(url, cookies=cookies)
    return resp

def delete_user(cookie, password):
    url = f"{BASE_URL}/auth/me"
    cookies = {"access_token": cookie}
    data = {"password": password}
    resp = requests.delete(url, cookies=cookies, data=data)
    return resp

def main():
    print("Starting backend verification...")
    
    # Step 1: Create two test users with random suffix to avoid conflicts
    print("\n1. Creating two test users...")
    import random
    import string
    random_suffix = ''.join(random.choices(string.ascii_lowercase, k=8))
    user1 = {"username": f"testuser_a_{random_suffix}", "password": "passwordA123"}
    user2 = {"username": f"testuser_b_{random_suffix}", "password": "passwordB123"}
    
    resp1 = register_user(user1["username"], user1["password"])
    if resp1.status_code != 200:
        print(f"Failed to create user A: {resp1.text}")
        sys.exit(1)
    print(f"User A created: {resp1.json()}")
    
    resp2 = register_user(user2["username"], user2["password"])
    if resp2.status_code != 200:
        print(f"Failed to create user B: {resp2.text}")
        sys.exit(1)
    print(f"User B created: {resp2.json()}")
    
    # Step 2: Log in both users to get cookies
    print("\n2. Logging in users to get cookies...")
    login_a = login_user(user1["username"], user1["password"])
    if login_a.status_code != 200:
        print(f"Failed to login user A: {login_a.text}")
        sys.exit(1)
    cookie_a = login_a.cookies.get("access_token")
    print(f"User A logged in, cookie obtained.")
    
    login_b = login_user(user2["username"], user2["password"])
    if login_b.status_code != 200:
        print(f"Failed to login user B: {login_b.text}")
        sys.exit(1)
    cookie_b = login_b.cookies.get("access_token")
    print(f"User B logged in, cookie obtained.")
    
    # Step 3: Verify that each user can only see their own data
    print("\n3. Verifying cross-user isolation...")
    # User A creates a transaction
    trans_data = {
        "type": "expense",
        "category": "grocery",
        "label": "User A's groceries",
        "amount": 50.0,
        "date": "2026-10-14"
    }
    resp_create_a = create_transaction(cookie_a, trans_data)
    if resp_create_a.status_code != 200:
        print(f"Failed to create transaction for user A: {resp_create_a.text}")
        sys.exit(1)
    trans_id_a = resp_create_a.json()["id"]
    print(f"User A created transaction ID: {trans_id_a}")
    
    # User A should be able to get their own transaction
    resp_get_a = get_transactions(cookie_a)
    if resp_get_a.status_code != 200:
        print(f"Failed to get transactions for user A: {resp_get_a.text}")
        sys.exit(1)
    trans_a = resp_get_a.json()
    if len(trans_a) != 1 or trans_a[0]["id"] != trans_id_a:
        print(f"User A did not see their own transaction: {trans_a}")
        sys.exit(1)
    print("User A can see their own transaction.")
    
    # User B should NOT be able to see user A's transaction
    resp_get_b = get_transactions(cookie_b)
    if resp_get_b.status_code != 200:
        print(f"Failed to get transactions for user B: {resp_get_b.text}")
        sys.exit(1)
    trans_b = resp_get_b.json()
    if len(trans_b) != 0:
        print(f"User B incorrectly saw user A's transaction: {trans_b}")
        sys.exit(1)
    print("User B cannot see user A's transaction (isolation verified).")
    
    # Step 4: Test validation
    print("\n4. Testing validation...")
    # Try to create a transaction with invalid type
    invalid_trans = trans_data.copy()
    invalid_trans["type"] = "invalid"
    resp_invalid = create_transaction(cookie_a, invalid_trans)
    if resp_invalid.status_code != 400:
        print(f"Expected 400 for invalid type, got {resp_invalid.status_code}: {resp_invalid.text}")
        sys.exit(1)
    print("Validation: invalid type -> 400 (OK)")
    
    # Try to create a transaction with amount <= 0
    invalid_trans["type"] = "expense"
    invalid_trans["amount"] = -10
    resp_invalid2 = create_transaction(cookie_a, invalid_trans)
    if resp_invalid2.status_code != 400:
        print(f"Expected 400 for negative amount, got {resp_invalid2.status_code}: {resp_invalid2.text}")
        sys.exit(1)
    print("Validation: negative amount -> 400 (OK)")
    
    # Try to create a transaction with label too long
    invalid_trans["amount"] = 50
    invalid_trans["label"] = "x" * 101  # 101 characters
    resp_invalid3 = create_transaction(cookie_a, invalid_trans)
    if resp_invalid3.status_code != 400:
        print(f"Expected 400 for long label, got {resp_invalid3.status_code}: {resp_invalid3.text}")
        sys.exit(1)
    print("Validation: long label -> 400 (OK)")
    
    # Step 5: Test rate limiting on auth endpoints
    print("\n5. Testing rate limiting on auth endpoints...")
    # We'll try to login 6 times in a row for user A (limit is 5/minute)
    # We expect the 6th request to return 429.
    # Note: we need to wait a bit between requests? The limiter is per minute, so we can do them quickly.
    rate_limit_ok = False
    for i in range(6):
        resp_login = login_user(user1["username"], user1["password"])
        if resp_login.status_code == 429:
            print(f"Rate limiting triggered on attempt {i+1} (status 429)")
            rate_limit_ok = True
            break
        elif resp_login.status_code != 200:
            print(f"Unexpected status during login: {resp_login.status_code}")
            sys.exit(1)
        # Small delay to avoid overwhelming the server, but not necessary
        time.sleep(0.1)
    
    if not rate_limit_ok:
        print("Rate limiting was not triggered after 6 login attempts.")
        sys.exit(1)
    
    # Step 6: Clean up test users and data
    print("\n6. Cleaning up test users and data...")
    # Delete user A's transaction (if any) - but we should delete the user which will cascade.
    # Delete user A
    resp_del_a = delete_user(cookie_a, user1["password"])
    if resp_del_a.status_code != 200:
        print(f"Failed to delete user A: {resp_del_a.text}")
        # Continue anyway
    else:
        print("User A deleted successfully.")
    
    # Delete user B
    resp_del_b = delete_user(cookie_b, user2["password"])
    if resp_del_b.status_code != 200:
        print(f"Failed to delete user B: {resp_del_b.text}")
        # Continue anyway
    else:
        print("User B deleted successfully.")
    
    # Verify that the users are gone by trying to access /me (should return 401)
    print("\n7. Verifying cleanup via /me endpoint...")
    # For user A
    resp_me_a_after = get_me(cookie_a)
    if resp_me_a_after.status_code != 401:
        print(f"User A still accessible after deletion: {resp_me_a_after.text}")
        sys.exit(1)
    print("User A cannot access /me after deletion (OK).")
    
    resp_me_b_after = get_me(cookie_b)
    if resp_me_b_after.status_code != 401:
        print(f"User B still accessible after deletion: {resp_me_b_after.text}")
        sys.exit(1)
    print("User B cannot access /me after deletion (OK).")
    
    print("\nAll verification tests passed!")
    return 0

if __name__ == "__main__":
    sys.exit(main())