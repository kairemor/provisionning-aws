terraform-apply:
	cd terraform/ && \
	terraform init && \
	terraform plan -out ${RESOURCE_NAME}.plan && \
	terraform apply -auto-approve -state-out="${RESOURCE_NAME}.tfstate" "${RESOURCE_NAME}.plan" 
	