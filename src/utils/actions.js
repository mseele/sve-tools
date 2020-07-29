function validateEmail(email) {
  const re = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
  return re.test(String(email).toLowerCase())
}

function replace(content, person) {
  const firstName = person.firstName.trim()
  const lastName = person.lastName.trim()
  return content
    .replaceAll('${vorname}', firstName)
    .replaceAll('${VORNAME}', firstName)
    .replaceAll('${firstName}', firstName)
    .replaceAll('${firstname}', firstName)
    .replaceAll('${FIRSTNAME}', firstName)
    .replaceAll('${nachname}', lastName)
    .replaceAll('${NACHNAME}', lastName)
    .replaceAll('${lastName}', lastName)
    .replaceAll('${lastname}', lastName)
    .replaceAll('${LASTNAME}', lastName)
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
