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

function readFile(inputFile) {
  const reader = new FileReader()

  return new Promise((resolve, reject) => {
    reader.onerror = () => {
      reader.abort()
      reject(new DOMException('Error reading file: ' + reader.error))
    }

    reader.onload = () => {
      var dataUrl = reader.result
      var base64 = dataUrl.split(',')[1]
      resolve(base64)
    }
    reader.readAsDataURL(inputFile)
  })
}

export { validateEmail, replace, readFile }
