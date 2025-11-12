POST http://localhost:8080/v1/fragments
Content-Type: text/plain; charset=utf-8
[BasicAuth]
user1@email.com:password1
`This is a UTF-8 text fragment!`

HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
# The server should return the type without charset in the JSON response
jsonpath "$.fragment.type" == "text/plain"
# Correct size: "This is a UTF-8 text fragment!" is 30 bytes
jsonpath "$.fragment.size" == 30
