document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loanForm = document.getElementById('loan-form');
    const materialList = document.getElementById('material-list');
    const borrowedMaterialList = document.getElementById('borrowed-material-list');
    const errorMessage = document.getElementById('error-message');

    // Login
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = 'home.html';
                } else {
                    errorMessage.textContent = 'Login inválido. Tente novamente.';
                }
            });
        });
    }

    // List materials
    function fetchMaterials(status) {
        fetch(`/materials?status=${status}`)
            .then(response => response.json())
            .then(data => {
                if (status === 'disponivel') {
                    materialList.innerHTML = '';
                    data.forEach((material) => {
                        const li = document.createElement('li');
                        li.className = 'list-group-item';
                        li.innerHTML = `
                            ${material.name}
                            <button onclick="editMaterial(${material.id}, '${material.name}')" class="btn btn-secondary btn-sm">Editar</button>
                            <button onclick="deleteMaterial(${material.id})" class="btn btn-danger btn-sm">Deletar</button>
                            <button onclick="borrowMaterial(${material.id})" class="btn btn-primary btn-sm">Emprestar</button>
                        `;
                        materialList.appendChild(li);
                    });
                } else if (status === 'emprestado') {
                    borrowedMaterialList.innerHTML = '';
                    data.forEach((material) => {
                        const li = document.createElement('li');
                        li.className = 'list-group-item';
                        li.innerHTML = `
                            ${material.name} - ${material.borrower} (De ${material.start_date} a ${material.end_date})
                            <button onclick="returnMaterial(${material.id})" class="btn btn-primary btn-sm">Devolver</button>
                            <button onclick="printItemPdf(${material.id})" class="btn btn-secondary btn-sm">Imprimir PDF</button>
                        `;
                        borrowedMaterialList.appendChild(li);
                    });
                }
            });
    }

    // Add material
    if (loanForm) {
        loanForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('material').value;

            fetch('/materials', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            })
            .then(response => response.json())
            .then(() => {
                fetchMaterials('disponivel');
                loanForm.reset();
            });
        });
    }

    // Edit material
    window.editMaterial = (id, oldName) => {
        const name = prompt('Nome do Material', oldName);

        if (name !== null) {
            fetch(`/materials/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            })
            .then(() => {
                fetchMaterials('disponivel');
            });
        }
    };

    // Delete material
    window.deleteMaterial = (id) => {
        fetch(`/materials/${id}`, {
            method: 'DELETE'
        })
        .then(() => {
            fetchMaterials('disponivel');
        });
    };

    // Borrow material
    window.borrowMaterial = (id) => {
        const borrower = prompt('Nome do Solicitante');
        const start_date = prompt('Data Inicial (dd/mm/yyyy)');
        const end_date = prompt('Data Final (dd/mm/yyyy)');

        if (borrower !== null && start_date !== null && end_date !== null) {
            fetch(`/materials/${id}/borrow`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ borrower, start_date, end_date })
            })
            .then(() => {
                fetchMaterials('disponivel');
                fetchMaterials('emprestado');
            });
        }
    };

    // Return material
    window.returnMaterial = (id) => {
        fetch(`/materials/${id}/return`, {
            method: 'PUT'
        })
        .then(() => {
            fetchMaterials('disponivel');
            fetchMaterials('emprestado');
        });
    };

    // Print item PDF
    window.printItemPdf = (id) => {
        window.open(`/generate-item-pdf/${id}`, '_blank');
    };

    // Fetch materials on load
    if (materialList) {
        fetchMaterials('disponivel');
    }
    if (borrowedMaterialList) {
        fetchMaterials('emprestado');
    }
});
