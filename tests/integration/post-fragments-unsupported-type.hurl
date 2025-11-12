POST http://localhost:8080/v1/fragments
Content-Type: application/xml
[BasicAuth]
user1@email.com:password1
`<message>Hello</message>`

HTTP/1.1 415
[Asserts]
jsonpath "$.error.message" == "Unsupported media type: application/xml"
