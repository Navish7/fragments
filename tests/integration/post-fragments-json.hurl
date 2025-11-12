POST http://localhost:8080/v1/fragments
Content-Type: application/json
[BasicAuth]
user1@email.com:password1
`{"message": "Hello JSON fragment!"}`

HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
# Correct size: `{"message": "Hello JSON fragment!"}` is 35 bytes
jsonpath "$.fragment.size" == 35

[Captures]
url: header "Location"

GET {{url}}
[BasicAuth]
user1@email.com:password1
HTTP/1.1 200
Content-Type: application/json
[Asserts]
jsonpath "$.message" == "Hello JSON fragment!"
