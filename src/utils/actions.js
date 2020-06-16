function validateEmail(email) {
  const re = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
  return re.test(String(email).toLowerCase())
}

function replace(content, person) {
  const firstName = person.firstName.trim()
  const lastName = person.lastName.trim()
  return content
    .replace('${vorname}', firstName)
    .replace('${VORNAME}', firstName)
    .replace('${firstName}', firstName)
    .replace('${firstname}', firstName)
    .replace('${FIRSTNAME}', firstName)
    .replace('${nachname}', lastName)
    .replace('${NACHNAME}', lastName)
    .replace('${lastName}', lastName)
    .replace('${lastname}', lastName)
    .replace('${LASTNAME}', lastName)
}

export { validateEmail, replace }
