# PUT Fragment Integration Test
# Tests updating existing fragments

# 1. First, create a fragment to update
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
`Original fragment content`

HTTP/1.1 201
[Asserts]
header "Location" exists
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/plain"
jsonpath "$.fragment.size" == 25

[Captures]
fragment_url: header "Location"
fragment_id: jsonpath "$.fragment.id"

# 2. Update the fragment with new content
PUT {{fragment_url}}
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
`Updated fragment content - this is the new version`

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == "{{fragment_id}}"
jsonpath "$.fragment.type" == "text/plain"
jsonpath "$.fragment.size" == 50
# We can't directly compare two jsonpath values in Hurl, so we'll check that updated exists and is a string
jsonpath "$.fragment.updated" isString

# 3. Verify the update by getting the fragment data
GET {{fragment_url}}
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
Content-Type: text/plain; charset=utf-8
[Asserts]
body == "Updated fragment content - this is the new version"

# 4. Test updating with wrong Content-Type (should fail)
PUT {{fragment_url}}
Content-Type: text/markdown
[BasicAuth]
user1@email.com:password1
`# This should fail`

HTTP/1.1 400
[Asserts]
jsonpath "$.error.message" contains "Content-Type must match"

# 5. Test updating non-existent fragment
PUT http://localhost:8080/v1/fragments/non-existent-id
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
`Some content`

HTTP/1.1 404
[Asserts]
jsonpath "$.error.message" == "Fragment not found"
