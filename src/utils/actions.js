function validateEmail(email) {
  const re = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
  return re.test(String(email).toLowerCase())
}

function replace(content, person) {
  const firstName = person.firstName.trim()
  const lastName = person.lastName.trim()
  return content
    .replace(/\$\{vorname\}/gi, firstName)
    .replace(/\$\{firstname\}/gi, firstName)
    .replace(/\$\{nachname\}/gi, lastName)
    .replace(/\$\{lastname\}/gi, lastName)
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
