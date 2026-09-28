// ============================================================
// Punlaan Admin Login
// Database + PHP Session
// ============================================================


const loginForm =
    document.getElementById('loginForm');

const emailInput =
    document.getElementById('email');

const passwordInput =
    document.getElementById('password');

const emailErr =
    document.getElementById('emailErr');

const passwordErr =
    document.getElementById('passwordErr');

const formErr =
    document.getElementById('formErr');

const submitBtn =
    document.getElementById('submitBtn');

const toggleBtn =
    document.getElementById('togglePw');

const eyeOpen =
    toggleBtn
        ? toggleBtn.querySelector('.eye-open')
        : null;

const eyeClosed =
    toggleBtn
        ? toggleBtn.querySelector('.eye-closed')
        : null;


/* ============================================================
   PASSWORD TOGGLE
============================================================ */

if (toggleBtn) {

    let showing = false;

    toggleBtn.addEventListener(
        'click',
        () => {

            showing = !showing;

            passwordInput.type =
                showing
                    ? 'text'
                    : 'password';

            if (eyeOpen) {
                eyeOpen.hidden = !showing;   // open eye while the password is visible
            }

            if (eyeClosed) {
                eyeClosed.hidden = showing;  // crossed eye while it's hidden
            }

            toggleBtn.setAttribute(
                'aria-pressed',
                showing ? 'true' : 'false'
            );

            toggleBtn.setAttribute(
                'aria-label',
                showing
                    ? 'Hide password'
                    : 'Show password'
            );

        }
    );

}


/* ============================================================
   CLEAR ERRORS
============================================================ */

emailInput.addEventListener(
    'input',
    () => {

        emailErr.textContent = '';
        formErr.textContent = '';

    }
);


passwordInput.addEventListener(
    'input',
    () => {

        passwordErr.textContent = '';
        formErr.textContent = '';

    }
);


/* ============================================================
   LOGIN
============================================================ */

loginForm.addEventListener(
    'submit',
    async (e) => {

        e.preventDefault();

        emailErr.textContent = '';
        passwordErr.textContent = '';
        formErr.textContent = '';


        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;


        if (!email) {

            emailErr.textContent =
                'Enter your email.';

            return;
        }


        if (!password) {

            passwordErr.textContent =
                'Enter your password.';

            return;
        }


        submitBtn.disabled = true;

        submitBtn.querySelector('.label').textContent =
            'Signing in...';


        try {

            const formData =
                new FormData();

            formData.append(
                'email',
                email
            );

            formData.append(
                'password',
                password
            );


            const response =
                await fetch(
                    'admin-login.php',
                    {
                        method: 'POST',
                        credentials: 'same-origin',
                        body: formData
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `Server returned HTTP ${response.status}`
                );

            }


            const result =
                await response.json();


            console.log(
                'Admin login:',
                result
            );


            if (!result.success) {

                formErr.textContent =
                    result.message ||
                    'Login failed.';

                return;
            }


            /* =================================================
               SUCCESS
            ================================================= */

            window.location.href =
                '../index.html';


        } catch (error) {

            console.error(
                'Admin login error:',
                error
            );

            formErr.textContent =
                'Unable to connect to the server.';


        } finally {

            submitBtn.disabled = false;

            submitBtn.querySelector('.label').textContent =
                'Sign in';

        }

    }
);