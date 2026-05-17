const container = document.querySelector(".container");
const btnSignIn= document.getElementById("btn-sign-in");
const btnSignUp= document.getElementById("btn-sign-up");

btnSignIn.addEventListener("click",()=>{
    container.classList.remove("toggle")
});

btnSignUp.addEventListener("click",()=>{
    container.classList.add("toggle")
});


async function cargarEspecialidades() {

    try {

        const response = await fetch(
            "/api/especialidades"
        );

        const especialidades =
            await response.json();

        const select =
            document.getElementById(
                "especialidad"
            );

        select.innerHTML =
            '<option value="">Seleccione una especialidad</option>';

        especialidades.forEach(esp => {

            const option =
                document.createElement("option");

            option.value =
                esp.nombre;

            option.textContent =
                esp.nombre;

            select.appendChild(option);
        });

    } catch(error){

        console.error(
            "Error cargando especialidades:",
            error
        );
    }
}

cargarEspecialidades();