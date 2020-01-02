openssl x509 -signkey bob_key.pem -in bob_csr.pem -req -days 1825 -out bob_cert.pem
openssl x509 -signkey alice_key.pem -in alice_csr.pem -req -days 1825 -out alice_cert.pem
openssl pkcs12 -export -out bob.p12 -inkey bob_key.pem -in bob_cert.pem
openssl pkcs12 -export -out alice-password.p12 -inkey alice_key.pem -in alice_cert.pem
